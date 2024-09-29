const buttonClose = document.getElementById("closeTrailer")

function mudaFoto (foto){
   document.getElementById('trailer').src = foto

}

function senhaError (senha){
   document.getElementById('senha')
   document.getElementById('confirma_senha')

   senha = 'senha'
   confirmasenha = 'confirma_senha'

   if(senha !== confirmasenha){
      print('Senhas incorretas')
   }
}


